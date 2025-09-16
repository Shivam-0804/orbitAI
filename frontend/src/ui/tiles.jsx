import styles from "./css/tiles.module.css";

export default function Tiles() {
  return (
    <div className={`${styles.root} `}>
      <div className={styles.background}>
        <div className={styles.tiles}>
          <div className={`${styles.tile} ${styles.tile1}`} />
          <div className={`${styles.tile} ${styles.tile2}`} />
          <div className={`${styles.tile} ${styles.tile3}`} />
          <div className={`${styles.tile} ${styles.tile4}`} />
          <div className={`${styles.tile} ${styles.tile5}`} />
          <div className={`${styles.tile} ${styles.tile6}`} />
          <div className={`${styles.tile} ${styles.tile7}`} />
          <div className={`${styles.tile} ${styles.tile8}`} />
          <div className={`${styles.tile} ${styles.tile9}`} />
          <div className={`${styles.tile} ${styles.tile10}`} />
        </div>

        <div className={`${styles.line} ${styles.line1}`} />
        <div className={`${styles.line} ${styles.line2}`} />
        <div className={`${styles.line} ${styles.line3}`} />
      </div>
    </div>
  );
}
