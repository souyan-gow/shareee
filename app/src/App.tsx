import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { BASE_URL } from './config';
import IndexRoute from './routes/Index';
import ManageRoute from './routes/Manage';
import SetupRoute from './routes/Setup';
import RequirePAT from './routes/RequirePAT';

const basename = BASE_URL.replace(/\/$/, '') || '/';

export default function App() {
  return (
    <BrowserRouter basename={basename}>
      <Routes>
        <Route path="/" element={<IndexRoute />} />
        <Route path="/manage/setup" element={<SetupRoute />} />
        <Route
          path="/manage"
          element={
            <RequirePAT>
              <ManageRoute />
            </RequirePAT>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
