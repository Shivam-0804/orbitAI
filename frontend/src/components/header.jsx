import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCode, faCircleUser} from "@fortawesome/free-solid-svg-icons";
import styles from "./css/header.module.css";

function Header() {
  return (
    <>
    <div className={styles.header}>
        {/* logo */}
        <div className={styles.logo}>
          <FontAwesomeIcon icon={faCode} className={styles.icon} />
          <p className={styles.name}>codec</p>
        </div>

        {/* user */}
        <div className={styles.image}>
            <FontAwesomeIcon icon={faCircleUser} className={styles.image} />
        </div>
    </div>
    </>
  );
}

export default Header;
