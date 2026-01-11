import { Button } from "@/components/ui/button"
import { Search, MessageCircleQuestionMark } from "lucide-react"

export const Header = () => {
  return (
    <>
      <div className="bg-white h-20 w-full flex items-center fixed top-0 left-0 z-101 px-5">
        <div className="w-full flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-15 h-15 overflow-hidden">
              <img src='/logo.png' alt='Logo' className='h-full w-full object-contain rounded-md' />
            </div>
            <div className="text-[24px] font-semibold">DOM Team</div>
            <div className="text-[24px] text-gray-600 font-semibold ml-5">DASHBOARD</div>
          </div>

          <div className="flex items-center gap-2">
            <Button className="bg-[var(--main-color)] hover:bg-[var(--main-hover)] rounded-full px-2.5">
              <Search />
            </Button>
            <Button className="bg-[var(--main-color)] hover:bg-[var(--main-hover)] rounded-full px-2.5">
              <MessageCircleQuestionMark />
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}