import { Files, Search, Settings } from "lucide-react";

import styles from "./css/options.module.css";
import Icon from "../ui/tab-icon";

function Options({ option, setOption, setShowOptions }) {
  const handleClick = function (value) {
    if (value === 2) {
      return;
    }
    if (value === option) {
      setOption(-1);
    } else {
      setOption(value);
      setShowOptions(value);
    }
  };

  return (
    <div className={styles.tab}>
      <Icon
        IconComponent={Files}
        color={"#d7d7d7"}
        selected={option}
        value={0}
        onClick={() => handleClick(0)}
      />

      <Icon
        IconComponent={Search}
        color={"#d7d7d7"}
        selected={option}
        value={1}
        onClick={() => handleClick(1)}
      />

      <Icon
        IconComponent={Settings}
        color={"#d7d7d7"}
        selected={option}
        value={2}
        onClick={() => handleClick(2)}
        style={{ marginTop: "auto" }}
      />
    </div>
  );
}

export default Options;
