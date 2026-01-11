import { Button } from "@/components/ui/button";
import { Search, MessageCircleQuestionMark } from "lucide-react";

export const Header = () => {
  return (
    <>
      <div className="bg-white h-20 w-full flex items-center fixed top-0 left-0 z-101 px-5">
        <div className="w-full flex justify-between items-center">
          <div className="flex items-center gap-3">
            <p className="text-[24px] font-semibold">DOM Team</p>
          </div>
          <div className="text-[24px] text-gray-700 font-semibold ml-5">
            Sale Management Dashboard
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
  );
};
