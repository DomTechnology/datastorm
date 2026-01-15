import Chatbot from "./components/ChatBot";
import { Header } from "./components/Header";
import { Sider } from "./components/Sider";

export default function MapLayout({ children }) {
  return (
    <>
      {/* <Header /> */}
      <div className="pb-20 mt-20// relative">
        <Sider />
        <main className="ml-64 px-10 scroll-smooth">{children}</main>
        <Chatbot />
      </div>
    </>
  );
}
