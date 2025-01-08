const SkeletonCard = () => (
    <div className="bg-white rounded-lg p-4 shadow-sm animate-pulse">
      <div className="flex items-center space-x-3 mb-4">
        <div className="h-10 w-10 rounded bg-gray-200"></div>
        <div className="h-4 w-32 bg-gray-200 rounded"></div>
      </div>
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="mb-4">
          <div className="flex justify-between">
            <div className="space-y-2">
              <div className="h-3 w-24 bg-gray-200 rounded"></div>
              <div className="h-2 w-32 bg-gray-200 rounded"></div>
            </div>
            <div className="h-4 w-16 bg-gray-200 rounded"></div>
          </div>
          {i < 5 && <div className="border-t border-gray-100 my-3" />}
        </div>
      ))}
    </div>
  );

export default SkeletonCard;