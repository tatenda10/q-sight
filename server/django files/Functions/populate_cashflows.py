from django.db import connection, transaction
from django.utils import timezone
from IFRS9.models import Dim_Run
from .save_log import save_log

def get_next_run_skey():
    """
    Retrieve and increment the next run_skey from the Dim_Run table atomically.
    """
    
    try:
        with transaction.atomic():
            run_key_record, created = Dim_Run.objects.get_or_create(id=1)
            if created:
                run_key_record.latest_run_skey = 1
            else:
                run_key_record.latest_run_skey += 1
            run_key_record.date = timezone.now()
            run_key_record.save()
            return run_key_record.latest_run_skey
    except Exception as e:
        save_log('get_next_run_skey', 'ERROR', f"Error in getting next run skey: {e}")
        return 1  # Default value in case of error

def insert_cash_flow_data(fic_mis_date):
    """
    Inserts data from FSI_Expected_Cashflow into fsi_financial_cash_flow_cal using a 
    single set-based SQL statement for high performance.
    """
    try:
        # Get the next run_skey
        next_run_skey = get_next_run_skey()
        if not next_run_skey:
            return '0'

        with connection.cursor() as cursor, transaction.atomic():
            # Ensure full table references to handle schema issues
            sql = """
            INSERT INTO public.fsi_financial_cash_flow_cal (
                v_account_number, d_cash_flow_date, n_run_skey, fic_mis_date,
                n_principal_run_off, n_interest_run_off, n_cash_flow_bucket_id,
                n_cash_flow_amount, v_ccy_code, n_exposure_at_default
            )
            SELECT
                v_account_number,
                d_cash_flow_date,
                %s,
                fic_mis_date,
                n_principal_payment,
                n_interest_payment,
                n_cash_flow_bucket,
                n_cash_flow_amount,
                v_ccy_code, 
                n_exposure_at_default
            FROM public.fsi_expected_cashflow
            WHERE fic_mis_date = %s;
            """
            # Execute the query with placeholders
            cursor.execute(sql, [next_run_skey, fic_mis_date])
            inserted_count = cursor.rowcount

        # Log the successful insertion
        save_log(
            'insert_cash_flow_data_setbased', 
            'INFO', 
            f"Inserted {inserted_count} records for fic_mis_date {fic_mis_date} with run key {next_run_skey}."
        )
        return '1'

    except Exception as e:
        # Log the error and return failure
        save_log('insert_cash_flow_data_setbased', 'ERROR', f"Error during cash flow insertion: {e}")
        return '0'
