import { Header } from "./components/Header";
import { Sider } from "./components/Sider";

export default function MapLayout({ children }) {
  return (
    <>
      <Header />
      <div className="bg-[#F5F5F5] pb-20 mt-20 relative">
        <Sider />
        <main className="ml-64 p-10 scroll-smooth">{children}</main>
      </div>
    </>
  )
}