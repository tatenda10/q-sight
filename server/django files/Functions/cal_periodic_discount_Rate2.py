
import numpy_financial as nf
from decimal import Decimal, ROUND_HALF_UP
from django.core.management.base import BaseCommand
from django.db import connection, transaction
from concurrent.futures import ThreadPoolExecutor, as_completed
import math
from datetime import datetime

# Import your logging utility
from .save_log import save_log  # Adjust the import path as necessary
from IFRS9.models import Dim_Run

# Define EIR boundaries (as decimal fractions)
MAX_EIR = Decimal('9.9999999999999')  # Max value as decimal fraction (999.99999999999%)
MIN_EIR = Decimal('0')                # Minimum EIR value (0%)

def get_latest_run_skey():
    """
    Retrieve the latest_run_skey from Dim_Run table.
    """
    try:
        run_record = Dim_Run.objects.only('latest_run_skey').first()
        if not run_record:
            save_log('get_latest_run_skey', 'ERROR', "No run key is available in Dim_Run")
            return None
        return run_record.latest_run_skey
    except Dim_Run.DoesNotExist:
        save_log('get_latest_run_skey', 'ERROR', "Dim_Run table is missing.")
        return None
    except Exception as e:
        save_log('get_latest_run_skey', 'ERROR', f"Error retrieving latest run key: {e}")
        return None

def calculate_discount_factors(fic_mis_date):
    """
    Efficiently calculate and update discount rates and factors for all records matching the given fic_mis_date and latest run key using a single set-based SQL statement.
    The calculation now uses different amortization units (D, M, Q, H, Y, etc.) based on the term_unit from fct_stage_determination table.
    """
    try:
        run_skey = get_latest_run_skey()
        if not run_skey:
            return 0

        # Perform set-based update in a single transaction
        with transaction.atomic(), connection.cursor() as cursor:
            sql = """
                UPDATE fsi_financial_cash_flow_cal f
                SET 
                    n_discount_rate = COALESCE(f.n_effective_interest_rate, f.n_discount_rate),
                    n_discount_factor = CASE 
                        WHEN COALESCE(f.n_effective_interest_rate, f.n_discount_rate) IS NOT NULL 
                             AND f.n_cash_flow_bucket_id IS NOT NULL
                        THEN 1 / POWER(
                            1 + COALESCE(f.n_effective_interest_rate, f.n_discount_rate), 
                            (f.n_cash_flow_bucket_id::FLOAT / 
                                CASE s.v_amrt_term_unit
                                    WHEN 'D' THEN 365    -- Daily
                                    WHEN 'W' THEN 52     -- Weekly
                                    WHEN 'M' THEN 12     -- Monthly
                                    WHEN 'Q' THEN 4      -- Quarterly
                                    WHEN 'H' THEN 2      -- Half-yearly
                                    WHEN 'Y' THEN 1      -- Annual
                                    ELSE 12              -- Default to Monthly if unknown
                                END)
                            )
                        ELSE f.n_discount_factor
                    END
                FROM fct_stage_determination s
                WHERE f.fic_mis_date = %s 
                  AND f.n_run_skey = %s
                  AND s.n_account_number = f.v_account_number
                  AND s.fic_mis_date = %s;
            """
            # Execute the SQL with fic_mis_date passed twice for f.fic_mis_date and s.fic_mis_date
            cursor.execute(sql, [fic_mis_date, run_skey, fic_mis_date])
            updated_count = cursor.rowcount

        save_log('calculate_discount_factors', 'INFO', f"Successfully updated {updated_count} records.")
        return 1 if updated_count > 0 else 0

    except Exception as e:
        save_log('calculate_discount_factors', 'ERROR', f"Error calculating discount factors: {e}")
        return 0

