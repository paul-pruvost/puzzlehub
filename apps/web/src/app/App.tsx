import { Route, Routes } from 'react-router-dom';
import { Layout } from './Layout';
import { HomePage } from '../pages/HomePage';
import { GamePage } from '../pages/GamePage';
import { DailyPage } from '../pages/DailyPage';
import { RankedHomePage } from '../pages/RankedHomePage';
import { RankedGamePage } from '../pages/RankedGamePage';
import { ProfilePage } from '../pages/ProfilePage';
import { NotFoundPage } from '../pages/NotFoundPage';

export function App(): JSX.Element {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/defi" element={<DailyPage />} />
        <Route path="/classe" element={<RankedHomePage />} />
        <Route path="/classe/:game" element={<RankedGamePage />} />
        <Route path="/profil" element={<ProfilePage />} />
        <Route path="/jeu/:id" element={<GamePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
