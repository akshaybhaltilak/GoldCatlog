import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Catalog from './Catalog';
import AdminPanel from './Adminpanel';


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Catalog />} />
        <Route path="/admin" element={<AdminPanel/>} />
      </Routes>
    </Router>
  );
}

export default App;