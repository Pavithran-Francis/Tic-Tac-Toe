export default function Board({ board, onClick }) {
    const renderSquare = (i) => {
      return (
        <button
          className="w-20 h-20 border border-gray-400 flex items-center justify-center text-4xl font-bold bg-white hover:bg-gray-100"
          onClick={() => onClick(i)}
          disabled={!!board[i]}
        >
          {board[i]}
        </button>
      )
    }
  
    return (
      <div className="grid grid-cols-3 gap-1">
        {Array(9).fill(null).map((_, i) => (
          <div key={i}>{renderSquare(i)}</div>
        ))}
      </div>
    )
  }