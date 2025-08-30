import { useState } from "react";

// eslint-disable-next-line no-unused-vars
function Icon({ color, IconComponent, selected, value, onClick }) {
  const [hover, setHover] = useState(false);

  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        fontSize: "2.4rem",
        width: "100%",
        cursor: "pointer",
        color: hover ? "#fff" : color,
        transition: "all 0.1s ease-in-out",
        padding: "10px 0",
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div
        style={{
          height: "150%",
          width: "3px",
          backgroundColor: selected === value ? "#4051b5" : "transparent",
          marginRight: "10px",
        }}
      />
      <IconComponent />
    </div>
  );
}

export default Icon;