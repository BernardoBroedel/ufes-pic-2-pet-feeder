import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { MeusPets } from "./pages/MeusPets";
import { Agenda } from "./pages/Agenda";
import { Camera } from "./pages/Camera";
import { Sensores } from "./pages/Sensores";

import { Operacional } from "./pages/Operacional";
import { Toaster } from "@/components/ui/sonner";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="meus-pets" element={<MeusPets />} />
          <Route path="agenda" element={<Agenda />} />
          <Route path="camera" element={<Camera />} />
          <Route path="sensores" element={<Sensores />} />

          <Route path="operacional" element={<Operacional />} />
        </Route>
      </Routes>
      <Toaster position="bottom-right" theme="dark" richColors />
    </BrowserRouter>
  );
}

export default App;
