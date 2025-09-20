import styles from "./css/footer.module.css";
import { ChevronsLeftRight } from 'lucide-react';

export default function Footer({ setShowTerminal }) {
  return (
    <div className={styles.footer}>
      <div className={styles.options}>
        <div onClick={() => setShowTerminal((prev) => !prev)} >
          <ChevronsLeftRight className={styles.optionItems}/>
        </div>
      </div>
    </div>
  );
}
