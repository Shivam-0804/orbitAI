import { BringToFront,CircleUser} from 'lucide-react';
import styles from "./css/header.module.css";

function Header() {
  return (
    <>
    <div className={styles.header}>
        {/* logo */}
        <div className={styles.logo}>
          <div className={styles.icon}><BringToFront/></div>
          <p className={styles.name}>orbitAI</p>
        </div>

        {/* user */}
        <div className={styles.image}>
            <CircleUser className={styles.image}/>
        </div>
    </div>
    </>
  );
}

export default Header;
