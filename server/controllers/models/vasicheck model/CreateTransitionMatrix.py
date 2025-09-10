import pandas as pd
import numpy as np

def create_transition_matrix(data, start_col, end_col, states):
    """
    Create a transition matrix from account-level data.
    
    Args:
        data: DataFrame containing account transitions
        start_col: Column name for starting state
        end_col: Column name for ending state
        states: Ordered list of all possible states
        
    Returns:
        Transition matrix (counts and probabilities)
    """
    # Initialize matrix
    tm_counts = pd.DataFrame(0, index=states, columns=states, dtype=int)
    
    # Count transitions
    for _, row in data.iterrows():
        tm_counts.loc[row[start_col], row[end_col]] += 1
    
    # Convert counts to probabilities
    tm_probs = tm_counts.div(tm_counts.sum(axis=1), axis=0)
    
    return tm_counts, tm_probs

# Example usage:
# Define states (DPD buckets)
states = ['0 DPD', '1-30 DPD', '31-60 DPD', '61-89 DPD', '90+ DPD']

# Sample account data (would be your actual portfolio data)
account_data = pd.DataFrame({
    'account_id': [1, 2, 3, 4, 5, 6, 7, 8],
    'start_state': ['0 DPD', '0 DPD', '1-30 DPD', '31-60 DPD', '0 DPD', '1-30 DPD', '61-89 DPD', '31-60 DPD'],
    'end_state': ['0 DPD', '1-30 DPD', '31-60 DPD', '90+ DPD', '0 DPD', '0 DPD', '90+ DPD', '61-89 DPD']
})

# Create transition matrix
counts, probs = create_transition_matrix(account_data, 'start_state', 'end_state', states)

print("Transition Counts:")
print(counts)
print("\nTransition Probabilities:")
print(probs)