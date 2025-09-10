# your_app/management/commands/update_eir_parallel.py

import numpy_financial as nf
from decimal import Decimal, ROUND_HALF_UP
from django.core.management.base import BaseCommand
from django.db import connection
from concurrent.futures import ThreadPoolExecutor, as_completed
import math
from datetime import datetime

# Import your logging utility
from .save_log import save_log  # Adjust the import path as necessary

# Define EIR boundaries (as decimal fractions)
MAX_EIR = Decimal('9.9999999999999')  # Max value as decimal fraction (999.99999999999%)
MIN_EIR = Decimal('0')                # Minimum EIR value (0%)

def process_chunk(rows):
    """
    Process a chunk of rows to compute EIR and update the database.

    Parameters:
    - rows: List of tuples in the format (id, account_number, carrying_amount, term_unit, [future_cash_flows])
    """
    with connection.cursor() as cursor:
        for record in rows:
            stage_id = record[0]
            account_number = record[1]
            carrying_amount = record[2]
            term_unit = record[3]
            future_cf_list = record[4]

            # Skip if no carrying amount or no future cash flows
            if carrying_amount is None or not future_cf_list:
                save_log(
                    'process_chunk',
                    'WARNING',
                    f"Skipping account_number={account_number} (stage_id={stage_id}) due to missing carrying amount or cash flows."
                )
                continue

            # Build the cash flow list (time 0 = -carrying_amount)
            try:
                cash_flows = [-float(carrying_amount)]
                cash_flows.extend(float(x) for x in future_cf_list if x is not None)
            except (ValueError, TypeError) as e:
                save_log(
                    'process_chunk',
                    'ERROR',
                    f"Invalid cash flow data for account_number={account_number} (stage_id={stage_id}): {e}"
                )
                continue

            # Compute periodic IRR
            try:
                periodic_irr = nf.irr(cash_flows)
                if periodic_irr is None:
                    raise ValueError("IRR computation returned None.")
            except Exception as e:
                save_log(
                    'process_chunk',
                    'ERROR',
                    f"IRR computation failed for account_number={account_number} (stage_id={stage_id}): {e}"
                )
                continue

            # Convert periodic IRR to annual EIR based on term_unit
            if term_unit == 'M':  # Monthly
                annual_eir = (1 + periodic_irr) ** 12 - 1
            elif term_unit == 'Q':  # Quarterly
                annual_eir = (1 + periodic_irr) ** 4 - 1
            elif term_unit == 'H':  # Half-yearly
                annual_eir = (1 + periodic_irr) ** 2 - 1
            elif term_unit == 'W':  # Weekly
                annual_eir = (1 + periodic_irr) ** 52 - 1
            elif term_unit == 'D':  # Daily
                annual_eir = (1 + periodic_irr) ** 365 - 1
            elif term_unit == 'Y':  # Annual
                annual_eir = periodic_irr
            else:
                # Default to periodic IRR if term unit is unknown
                save_log(
                    'process_chunk',
                    'WARNING',
                    f"Unknown term_unit='{term_unit}' for account_number={account_number} (stage_id={stage_id}). Using periodic IRR without annualization."
                )
                annual_eir = periodic_irr

            # Convert EIR to decimal fraction and round appropriately
            annual_eir_decimal = Decimal(annual_eir).quantize(Decimal('0.0000000000'), rounding=ROUND_HALF_UP)

            # Clamp the EIR to [MIN_EIR, MAX_EIR]
            annual_eir_decimal = max(min(annual_eir_decimal, MAX_EIR), MIN_EIR)

            # Update the database
            try:
                cursor.execute("""
                    UPDATE fct_stage_determination
                       SET n_effective_interest_rate = %s
                     WHERE id = %s
                """, [annual_eir_decimal, stage_id])
                save_log(
                    'process_chunk',
                    'INFO',
                    f"Updated EIR for account_number={account_number} (stage_id={stage_id}): {annual_eir_decimal}"
                )
            except Exception as e:
                save_log(
                    'process_chunk',
                    'ERROR',
                    f"Database update failed for account_number={account_number} (stage_id={stage_id}): {e}"
                )
                continue

def update_eir_using_cashflows(fic_mis_date):
    """
    Main function to update EIR for all accounts on a given fic_mis_date using parallel processing.

    Parameters:
    - fic_mis_date: The reporting date (datetime.date) for which to update EIR.
    
    Returns:
    - bool: True if successful, False otherwise.
    """
    try:
        # Step 1: Fetch all relevant records with aggregated future cash flows
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT
                    s.id,
                    s.n_account_number,
                    s.n_carrying_amount_ncy,
                    s.v_amrt_term_unit,
                    ARRAY_AGG(cf.n_cash_flow_amount ORDER BY cf.d_cash_flow_date) AS future_cash_flows
                FROM fct_stage_determination s
                JOIN fsi_expected_cashflow cf
                  ON s.n_account_number = cf.v_account_number
                 AND cf.d_cash_flow_date >= s.fic_mis_date
                WHERE s.fic_mis_date = %s AND cf.fic_mis_date = %s
                GROUP BY
                    s.id,
                    s.n_account_number,
                    s.n_carrying_amount_ncy,
                    s.v_amrt_term_unit
            """, [fic_mis_date, fic_mis_date])
            rows = cursor.fetchall()

        total_rows = len(rows)
        if total_rows == 0:
            save_log(
                'update_eir_parallel',
                'INFO',
                f"No records found for fic_mis_date={fic_mis_date}."
            )
            return True  # Not an error; simply no records to process

        save_log(
            'update_eir_parallel',
            'INFO',
            f"Fetched {total_rows} records for fic_mis_date={fic_mis_date}."
        )

        # Step 2: Determine batch size (~5% each, resulting in ~20 batches)
        batch_count = 20
        batch_size = math.ceil(total_rows / batch_count)
        batches = [rows[i:i + batch_size] for i in range(0, total_rows, batch_size)]
        actual_batch_count = len(batches)

        save_log(
            'update_eir_parallel',
            'INFO',
            f"Partitioned data into {actual_batch_count} batches (each ~{batch_size} records)."
        )

        # Step 3: Process each batch in parallel using ThreadPoolExecutor
        with ThreadPoolExecutor(max_workers=actual_batch_count) as executor:
            futures = [executor.submit(process_chunk, batch) for batch in batches]

            # Monitor progress and handle exceptions
            for future in as_completed(futures):
                try:
                    future.result()  # If process_chunk raises, re-raise here
                except Exception as exc:
                    save_log(
                        'update_eir_parallel',
                        'ERROR',
                        f"Error in processing a batch: {exc}"
                    )

        # Step 4: Clamp the EIR values to [MIN_EIR, MAX_EIR] as an extra safety measure
        # Note: This step might be redundant as clamping is done per row
        # But included here for extra safety
        with connection.cursor() as cursor:
            cursor.execute("""
                UPDATE fct_stage_determination
                SET n_effective_interest_rate = LEAST(GREATEST(n_effective_interest_rate, %s), %s)
                WHERE fic_mis_date = %s
                  AND n_effective_interest_rate IS NOT NULL;
            """, [MIN_EIR, MAX_EIR, fic_mis_date])

        save_log(
            'update_eir_parallel',
            'INFO',
            f"Successfully updated EIR for {total_rows} records on fic_mis_date={fic_mis_date}."
        )

        return True

    except Exception as e:
        # Log any unexpected errors
        save_log(
            'update_eir_parallel',
            'ERROR',
            f"Unexpected error during EIR update for fic_mis_date={fic_mis_date}: {e}"
        )
        return False


class Command(BaseCommand):
    help = "Update Effective Interest Rate (EIR) for all accounts on a given fic_mis_date using parallel processing."

    def add_arguments(self, parser):
        parser.add_argument(
            'fic_mis_date',
            type=str,
            help='Reporting date in YYYY-MM-DD format'
        )

    def handle(self, *args, **options):
        fic_mis_date_str = options['fic_mis_date']
        try:
            fic_mis_date = datetime.strptime(fic_mis_date_str, '%Y-%m-%d').date()
        except ValueError:
            self.stdout.write(self.style.ERROR("Invalid date format. Use YYYY-MM-DD."))
            return

        self.stdout.write(f"Starting EIR update for fic_mis_date={fic_mis_date}...")
        save_log(
            'update_eir_parallel',
            'INFO',
            f"Starting EIR update for fic_mis_date={fic_mis_date}."
        )

        result = update_eir_using_cashflows(fic_mis_date)

        if result:
            self.stdout.write(self.style.SUCCESS(f"EIR update process completed for {fic_mis_date}."))
            save_log(
                'update_eir_parallel',
                'INFO',
                f"EIR update process completed for fic_mis_date={fic_mis_date}."
            )
        else:
            self.stdout.write(self.style.ERROR(f"EIR update process failed for {fic_mis_date}."))
            save_log(
                'update_eir_parallel',
                'ERROR',
                f"EIR update process failed for fic_mis_date={fic_mis_date}."
            )
