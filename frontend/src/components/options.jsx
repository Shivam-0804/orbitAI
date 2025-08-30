import { Files, Search } from "lucide-react";

import styles from "./css/options.module.css";
import Icon from "../ui/tab-icon";

function Options({option, setOption}) {
  const handleClick = function (value) {
    if (value === option) {
      setOption(-1);
    } else {
      setOption(value);
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
    </div>
  );
}

export default Options;
