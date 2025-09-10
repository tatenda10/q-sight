import numpy as np
import pandas as pd
from scipy.stats import norm

class VasicekModel:
    """
    Implementation of the Vasicek Single Factor model for PD calculation
    as described in the OMFIN Model Documentation.
    """
    
    def __init__(self):
        # Initialize with default parameters
        self.rho = None  # Asset correlation
        self.ttc_pd = None  # Through-The-Cycle PD
        self.z = None  # Economic state factor
        
    def calculate_asset_correlation(self, pd, portfolio_type="Other Retail"):
        """
        Calculate asset correlation based on portfolio type and PD
        as per Basel regulatory formulas.
        
        Args:
            pd: Probability of Default
            portfolio_type: Type of portfolio ("Other Retail", etc.)
            
        Returns:
            Asset correlation (rho)
        """
        if portfolio_type == "Other Retail":
            # Formula for Other Retail (Regular Loans and Irregular Loans)
            rho = 0.03 * ((1 - np.exp(-35 * pd)) / (1 - np.exp(-35)) + \
                  0.16 * (1 - (1 - np.exp(-35 * pd)) / (1 - np.exp(-35)))
        else:
            # Add other portfolio types if needed
            rho = 0.15  # Default value
            
        self.rho = rho
        return rho
    
    def calculate_ttc_pd(self, transition_matrix):
        """
        Calculate Through-The-Cycle PD from transition matrix.
        
        Args:
            transition_matrix: Pandas DataFrame with transition counts/probabilities
            
        Returns:
            TTC PD values
        """
        # Convert counts to probabilities if needed
        if not all(transition_matrix.sum(axis=1).round(2) == 1.0:
            transition_matrix = transition_matrix.div(transition_matrix.sum(axis=1), axis=0)
            
        # Extract PDs (last column)
        ttc_pd = transition_matrix.iloc[:, -1]
        self.ttc_pd = ttc_pd
        return ttc_pd
    
    def fit_ttc_pd_curve(self, observed_pd, ranks):
        """
        Fit TTC PD curve to fix Rank Order Breach issues.
        
        Args:
            observed_pd: Observed PD values
            ranks: Ranks of DPD buckets or rating grades
            
        Returns:
            Fitted PD values
        """
        # Step 1: Convert PDs to log odds
        log_odds = np.log(observed_pd / (1 - observed_pd))
        
        # Step 2: Compute intercept and slope
        slope, intercept = np.polyfit(ranks, log_odds, 1)
        
        # Step 3: Back-solve for intercept to maintain segment default rate
        # (Simplified here - actual implementation would optimize this)
        fitted_log_odds = slope * ranks + intercept
        
        # Step 4: Convert back to PDs
        fitted_pd = np.exp(fitted_log_odds) / (1 + np.exp(fitted_log_odds))
        
        return fitted_pd
    
    def calculate_pit_pd(self, ttc_pd, z=None):
        """
        Calculate Point-In-Time PD using Vasicek Single Factor model.
        
        Args:
            ttc_pd: Through-The-Cycle PD
            z: Economic state factor (if None, uses self.z)
            
        Returns:
            PIT PD values
        """
        if z is None:
            if self.z is None:
                raise ValueError("Economic state factor z not provided")
            z = self.z
            
        if self.rho is None:
            raise ValueError("Asset correlation rho not calculated")
            
        # Calculate PIT PD using Vasicek formula
        d = norm.ppf(ttc_pd)  # Default threshold
        pit_pd = norm.cdf((d - np.sqrt(self.rho) * z) / np.sqrt(1 - self.rho))
        
        return pit_pd
    
    def calculate_marginal_pd(self, unconditional_pd, survival_probability):
        """
        Calculate marginal PD with survival adjustment.
        
        Args:
            unconditional_pd: Unconditional PD
            survival_probability: Survival probability from t=0 to t-1
            
        Returns:
            Marginal PD
        """
        return unconditional_pd * survival_probability
    
    def scenario_weighted_pd(self, marginal_pds, scenario_weights):
        """
        Calculate scenario-weighted marginal PD.
        
        Args:
            marginal_pds: Dictionary of marginal PDs by scenario
            scenario_weights: Dictionary of scenario weights
            
        Returns:
            Weighted PD
        """
        return sum(marginal_pds[scenario] * weight for scenario, weight in scenario_weights.items())
    
    def estimate_economic_state(self, gdp_data, n_clusters=3, n_init=10000):
        """
        Estimate economic state (z) using K-means clustering on GDP data.
        
        Args:
            gdp_data: DataFrame with GDP growth data
            n_clusters: Number of clusters (default 3 for Best/Base/Worst)
            n_init: Number of initializations for K-means
            
        Returns:
            Cluster assignments and standardized GDP values
        """
        from sklearn.cluster import KMeans
        
        # Standardize GDP data
        gdp_mean = gdp_data.mean()
        gdp_std = gdp_data.std()
        standardized_gdp = (gdp_data - gdp_mean) / gdp_std
        
        # Perform K-means clustering
        kmeans = KMeans(n_clusters=n_clusters, n_init=n_init, random_state=42)
        clusters = kmeans.fit_predict(standardized_gdp.values.reshape(-1, 1))
        
        # Sort clusters by mean GDP (Best = highest GDP, Worst = lowest)
        cluster_means = [standardized_gdp[clusters == i].mean() for i in range(n_clusters)]
        sorted_clusters = np.argsort(cluster_means)[::-1]
        cluster_map = {sorted_clusters[i]: ['Best', 'Base', 'Worst'][i] for i in range(n_clusters)}
        
        # Map clusters to scenarios
        scenarios = [cluster_map[c] for c in clusters]
        
        # For PIT PD, we need the standardized GDP value as z
        self.z = standardized_gdp
        
        return pd.DataFrame({
            'Year': gdp_data.index,
            'GDP_Growth': gdp_data.values,
            'Cluster': clusters,
            'Scenario': scenarios,
            'Standardized_GDP': standardized_gdp.values
        })


class LGDModel:
    """
    Implementation of LGD model as per OMFIN documentation.
    """
    
    def __init__(self):
        # Default LGD for unsecured retail exposures
        self.lgd = 0.45  # 45% as per Basel II
        
    def get_lgd(self, exposure_type="Unsecured Retail"):
        """
        Get LGD value based on exposure type.
        
        Args:
            exposure_type: Type of exposure
            
        Returns:
            LGD value
        """
        if exposure_type == "Unsecured Retail":
            return self.lgd
        else:
            # Add other exposure types if needed
            return 0.45  # Default to unsecured retail