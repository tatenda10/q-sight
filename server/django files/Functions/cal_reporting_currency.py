import requests
from concurrent.futures import ThreadPoolExecutor
from django.db import connection, transaction, DatabaseError
from django.db.models import Sum
from django.utils import timezone
from decimal import Decimal
from IFRS9.models import DimExchangeRateConf, Ldn_Exchange_Rate, FCT_Reporting_Lines, ReportingCurrency, Dim_Run
from .save_log import save_log

EXCHANGE_RATE_API_URL = 'https://v6.exchangerate-api.com/v6/'

def get_latest_run_skey():
    """Retrieve the latest_run_skey from Dim_Run table."""
    try:
        run_record = Dim_Run.objects.first()
        if not run_record:
            save_log('get_latest_run_skey', 'ERROR', "No run key available in Dim_Run table.")
            return None
        return run_record.latest_run_skey
    except Dim_Run.DoesNotExist:
        save_log('get_latest_run_skey', 'ERROR', "Dim_Run table is missing.")
        return None

def get_exchange_rates_from_api(base_currency, date=None, use_latest=False):
    """Fetch exchange rates for a base currency either for the latest or for a specific date (historical)."""
    try:
        exchange_rate_conf = DimExchangeRateConf.objects.filter(use_on_exchange_rates=True).first()
        if not exchange_rate_conf:
            save_log('get_exchange_rates_from_api', 'ERROR', "API usage is disabled.")
            return None

        EXCHANGE_RATE_API_KEY = exchange_rate_conf.EXCHANGE_RATE_API_KEY
        if use_latest:
            url = f"{EXCHANGE_RATE_API_URL}{EXCHANGE_RATE_API_KEY}/latest/{base_currency}"
        else:
            if not date:
                save_log('get_exchange_rates_from_api', 'ERROR', "Historical rates require a date.")
                return None
            year, month, day = date.split('-')
            url = f"{EXCHANGE_RATE_API_URL}{EXCHANGE_RATE_API_KEY}/history/{base_currency}/{int(year)}/{int(month)}/{int(day)}"

        response = requests.get(url)
        data = response.json()
        save_log('get_exchange_rates_from_api', 'INFO', f"Response Status: {response.status_code}, Text: {response.text}")

        if response.status_code == 200 and data.get('result') == "success":
            save_log('get_exchange_rates_from_api', 'INFO', f"Fetched exchange rates for {base_currency} on {date if not use_latest else 'latest'}")
            return data['conversion_rates']
        else:
            error_type = data.get('error-type', 'Unknown error')
            save_log('get_exchange_rates_from_api', 'ERROR', f"Exchange rate API error: {error_type}")
            return None
    except Exception as e:
        save_log('get_exchange_rates_from_api', 'ERROR', f"Error fetching exchange rates from API: {e}")
        return None

def fetch_and_save_exchange_rates_from_api(target_currency_code, fic_mis_date, use_latest):
    """Fetch exchange rates from the API and save them to the database."""
    exchange_rates = get_exchange_rates_from_api(target_currency_code, fic_mis_date, use_latest)
    if not exchange_rates:
        save_log('fetch_and_save_exchange_rates_from_api', 'ERROR', "Unable to fetch exchange rates from API.")
        return None

    Ldn_Exchange_Rate.objects.filter(fic_mis_date=fic_mis_date).delete()
    save_log('fetch_and_save_exchange_rates_from_api', 'INFO', f"Deleted old exchange rates for date {fic_mis_date}.")

    exchange_rate_dict = {}
    exchange_rate_entries = []
    for from_currency, exchange_rate in exchange_rates.items():
        inverted_exchange_rate = Decimal(str(exchange_rate)) if from_currency == target_currency_code else 1 / Decimal(str(exchange_rate))
        exchange_rate_dict[(from_currency, target_currency_code)] = inverted_exchange_rate
        exchange_rate_entries.append(
            Ldn_Exchange_Rate(
                fic_mis_date=fic_mis_date,
                v_from_ccy_code=from_currency,
                v_to_ccy_code=target_currency_code,
                n_exchange_rate=inverted_exchange_rate,
                d_last_updated=timezone.now()
            )
        )

    Ldn_Exchange_Rate.objects.bulk_create(exchange_rate_entries)
    return exchange_rate_dict

def fetch_manual_exchange_rates(target_currency_code, fic_mis_date):
    """Fetch manually loaded exchange rates from the database."""
    exchange_rates = Ldn_Exchange_Rate.objects.filter(fic_mis_date=fic_mis_date)
    if not exchange_rates.exists():
        save_log('fetch_manual_exchange_rates', 'ERROR', f"No manually loaded exchange rates found for date {fic_mis_date}.")
        return None

    return {(rate.v_from_ccy_code, rate.v_to_ccy_code): rate.n_exchange_rate for rate in exchange_rates}

def update_reporting_lines_sql(fic_mis_date, exchange_rate_dict, target_currency_code):
    """
    Update reporting lines using SQL-based bulk updates based on exchange rates.
    """
    n_run_key = get_latest_run_skey()
    if not n_run_key:
        save_log('update_reporting_lines', 'ERROR', "No run key available.")
        return "No run key available."

    with connection.cursor() as cursor, transaction.atomic():
        # Update rows where currency matches target currency (no conversion needed)
        cursor.execute("""
            UPDATE fct_reporting_lines
            SET 
                n_exposure_at_default_rcy = n_exposure_at_default_ncy,
                n_carrying_amount_rcy = n_carrying_amount_ncy,
                n_lifetime_ecl_rcy = n_lifetime_ecl_ncy,
                n_12m_ecl_rcy = n_12m_ecl_ncy
            WHERE 
                n_run_key = %s 
                AND fic_mis_date = %s 
                AND v_ccy_code = %s;
        """, [n_run_key, fic_mis_date, target_currency_code])

        # Update rows for each foreign currency using its exchange rate
        for (from_ccy, to_ccy), exchange_rate in exchange_rate_dict.items():
            if from_ccy == target_currency_code or to_ccy != target_currency_code:
                continue

            cursor.execute("""
                UPDATE fct_reporting_lines
                SET 
                    n_exposure_at_default_rcy = %s * n_exposure_at_default_ncy,
                    n_carrying_amount_rcy = %s * n_carrying_amount_ncy,
                    n_lifetime_ecl_rcy = %s * n_lifetime_ecl_ncy,
                    n_12m_ecl_rcy = %s * n_12m_ecl_ncy
                WHERE 
                    n_run_key = %s 
                    AND fic_mis_date = %s 
                    AND v_ccy_code = %s;
            """, [
                exchange_rate, exchange_rate, exchange_rate, exchange_rate,
                n_run_key, fic_mis_date, from_ccy
            ])

    save_log('update_reporting_lines_sql', 'INFO', 
             f"SQL-based update completed for {len(exchange_rate_dict)} exchange rates on {fic_mis_date}.")
    return f"SQL-based update successful for {fic_mis_date}."

def update_reporting_lines(fic_mis_date, exchange_rate_dict, target_currency_code):
    """Update reporting lines using SQL-based bulk updates."""
    return update_reporting_lines_sql(fic_mis_date, exchange_rate_dict, target_currency_code)

def update_reporting_lines_with_exchange_rate(fic_mis_date):
    """
    Main function to update reporting lines based on exchange rates.
    Returns:
        1: Success
        0: Failure
    """
    try:
        exchange_rate_conf = DimExchangeRateConf.objects.first()
        if not exchange_rate_conf:
            save_log('update_reporting_lines_with_exchange_rate', 'ERROR', "No valid exchange rate configuration found.")
            return 0

        use_online = exchange_rate_conf.use_on_exchange_rates
        use_latest = exchange_rate_conf.use_latest_exchange_rates

        reporting_currency = ReportingCurrency.objects.first()
        if not reporting_currency:
            save_log('update_reporting_lines_with_exchange_rate', 'ERROR', "No reporting currency defined.")
            return 0
        
        target_currency_code = reporting_currency.currency_code.code

        if use_online:
            exchange_rate_dict = fetch_and_save_exchange_rates_from_api(target_currency_code, fic_mis_date, use_latest)
        else:
            exchange_rate_dict = fetch_manual_exchange_rates(target_currency_code, fic_mis_date)

        if not exchange_rate_dict:
            save_log('update_reporting_lines_with_exchange_rate', 'ERROR', "Unable to retrieve exchange rates.")
            return 0

        update_result = update_reporting_lines(fic_mis_date, exchange_rate_dict, target_currency_code)
        return 1 

    except ValueError as ve:
        save_log('update_reporting_lines_with_exchange_rate', 'ERROR', f"Value Error: {str(ve)}")
        return 0
    except Exception as e:
        save_log('update_reporting_lines_with_exchange_rate', 'ERROR', f"Error during update: {str(e)}")
        return 0

