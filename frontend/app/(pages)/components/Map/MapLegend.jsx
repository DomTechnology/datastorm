export const MapLegend = () => {
  return (
    <div className="absolute bottom-10 right-4 bg-white rounded-lg shadow-lg p-4 text-sm space-y-3">
      {/* Size legend */}
      <div>
        <div className="font-semibold mb-1">Net Sales</div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-gray-500"></div>
          <span>Low</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-gray-500"></div>
          <span>Medium</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-gray-500"></div>
          <span>High</span>
        </div>
      </div>

      {/* Color legend */}
      <div>
        <div className="font-semibold mb-1">Stock-out rate</div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#22c55e]"></div>
          <span>Low</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#f97316]"></div>
          <span>Medium</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#ef4444]"></div>
          <span>High</span>
        </div>
      </div>
    </div>
  );
};
