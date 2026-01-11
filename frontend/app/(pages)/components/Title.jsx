export const Title = ({ text, className }) => {
  return (
    <div className={`text-[40px] font-extrabold flex items-center justify-center z-100 ${className}`}>
      {text}
    </div>
  )
}