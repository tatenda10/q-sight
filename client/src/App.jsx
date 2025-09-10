import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Login from './pages/Login';
import PrivateRoutes from './components/shared/PrivateRoutes';
import Dashboard from './pages/Dashboard';
import Users from './pages/user settings/Users';
import Audit_logs from './pages/user settings/Audit_logs';

// Data Configuration Routes
import ProductConfiguration from './pages/data_config/ProductConfiguration';
import ViewLoadedData from './pages/data_config/ViewLoadedData';
import LoadData from './pages/data_config/LoadData';
import LoadProducts from './pages/data_config/LoadProducts';

//classification and measurement
import ClassificationMeasurement from './pages/classification measurement/ClassificationMeasurement';

//cashflows
import Cashflows from './pages/cashflows/Cashflows';
import CashflowsConfig from './pages/cashflows/CashflowsConfig';
import AccountCashflows from './pages/cashflows/AccountCashflows';
import ViewLoanCashflows from './pages/cashflows/ViewLoanCashflows';

//staging
import StagingConfig from './pages/staging/StagingConfig';
import StageReassigment from './pages/staging/StageReassigment';
import StagingRatingsConfig from './pages/staging/StagingRatingsConfig';

//pd config
import PDConfig from './pages/pd config/PDConfig';
import PdMethodology from './pages/pd config/PdMethodology';
import PdDocumentation from './pages/pd config/Documentation';
import ViewDocumentation from './pages/pd config/ViewDocumentation';
import CreateDocumentation from './pages/pd config/PdDocumentation';
//lgd config
import LGDConfig from './pages/lgd config/LGDConfig';
import LGDMethodolody from './pages/lgd config/LGDMethodolody';
import LGDDocumentation from './pages/lgd config/LGDDocumentation';

//ecl calculation
import ECLCalculation from './pages/ecl calculation/ECLCalculation';
import Configuration from './components/ecl/Configuration';
import ViewResults from './pages/ecl calculation/ViewResults'
import Reports from './pages/reports/Reports';
import ECLAnalysis from './pages/ECLAnalysis';

import UploadCashflows from './pages/cashflows/UploadCashflows';
import PdDevelopment from './pages/pd development/PdDevelopment';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public Route */}
          <Route path="/" element={<Login />} />

          {/* Protected Routes */}
          <Route element={<PrivateRoutes />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/users" element={<Users />} />
            <Route path="/audit-logs" element={<Audit_logs />} />

            {/* Data Configuration Routes */}
            <Route path="/product-configuration" element={<ProductConfiguration />} />
            <Route path="/view-loaded-data" element={<ViewLoadedData />}/>
            <Route path="/load-data" element={<LoadData />} />
            <Route path="/load-products" element={<LoadProducts />} />

            {/* classification routes */}
            <Route path="/classification-measurement" element={<ClassificationMeasurement />} />
          
            {/* cashflows routes */}
            <Route path="/cashflows" element={<AccountCashflows />} />
            <Route path="/cashflows-config" element={<CashflowsConfig />} />
            <Route path="/account-cashflows" element={<AccountCashflows />} />
            <Route path="/view-loan-cashflows" element={<ViewLoanCashflows />} />
            {/* staging routes */}
            <Route path="/staging-config" element={<StagingConfig />} />
            <Route path="/stage-reassignment" element={<StageReassigment />} />
            <Route path="/staging-ratings-config" element={<StagingRatingsConfig />} />
            
            {/* pd config routes */}
            <Route path="/pd-config" element={<PDConfig />} />
            <Route path="/pd-methodology" element={<PdMethodology />} />
            <Route path="/pd-documentation" element={<PdDocumentation />} />
            <Route path="/documentation/:id" element={<ViewDocumentation />} />
            <Route path="/create-documentation" element={<CreateDocumentation />} />
            <Route path="/pit-pd-development" element={<PdDevelopment />} />
            {/* lgd config routes */}
            <Route path="/lgd-config" element={<LGDConfig />} />
            <Route path="/lgd-methodology" element={<LGDMethodolody />} />
            <Route path="/lgd-documentation" element={<LGDDocumentation />} />

            {/* ecl calculation routes */}
            <Route path="/ecl-calculation" element={<ECLCalculation />} />
            <Route path="/ecl-configuration" element={<Configuration />} />
            <Route path="/ecl-results" element={<ViewResults />} />
            <Route path="/ecl-analysis" element={<ECLAnalysis />} />
            {/* reports routes */}
            <Route path="/reports" element={<Reports />} />
            <Route path="/upload-cashflows" element={<UploadCashflows />} />
          </Route>

          {/* Redirect root to dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;