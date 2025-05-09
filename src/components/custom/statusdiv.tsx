

let icon = {
  success: "✓",
  pending: "⏳",
  failed: "✗"
}
let color = {
  success: "text-green-500",
  pending: "text-yellow-500",
  failed: "text-red-500"
}
type StatusData = {
  status: "success" | "pending" | "failed";
  message: string;
}[];

function StatusDiv({ data , type }: { data: StatusData , type: string }) {

  if(!data || data.length === 0){
    return (
        <div className="flex flex-col items-center justify-center p-4 border border-gray-200 rounded-md bg-gray-50">
            <p className="text-sm text-gray-500">No status has been provided yet</p>
        </div>
    )
  }
  console.log({data});
  if(type === "content"){
    return (
      <div className="space-y-2 max-h-[200px] overflow-y-auto">
        {data.map((item, index) => {
          return (
            <div key={index} className={`flex items-center space-x-2 ${color[item.status]} bg-gray-50 p-2 rounded-md`}>
              <span className="text-xl">{icon[item.status]}</span>
              <span className="font-semibold">{item.message}</span>
            </div>
          )
        })}
      </div>
    )
  }



  return (
    <div className="space-y-2 max-h-[200px] overflow-y-auto">
      {data.map((item, index) => {
        if (item.status === "stop") {
          return (
            <div key={index} className="flex items-center space-x-2 text-blue-500 bg-blue-50 p-2 rounded-md">
              <span className="text-xl">🛑</span>
              <span className="font-semibold">{item.message}</span>
            </div>
          );
        }
        if (item.status === "error") {
          return (
            <div key={index} className="flex items-center space-x-2 text-red-500 bg-red-50 p-2 rounded-md">
              <span className="text-xl">⚠️</span>
              <span className="font-semibold">{item.message}</span>
            </div>
          );
        }
        return (
          <div key={index} className={`flex items-center space-x-2 ${color[item.status]} bg-gray-50 p-2 rounded-md`}>
            <span className="text-xl">{icon[item.status]}</span>
            <span className="font-semibold">{item.message}</span>
          </div>
        );
      })}
    </div>
  );
}

export default StatusDiv;