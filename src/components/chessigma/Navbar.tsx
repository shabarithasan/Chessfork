"use client";

import styles from "./styles.module.css";

export function Navbar() {
  return (
    <nav className={styles.navbar}>
      <div className={styles.navLeft}>
        <a href="/chessigma" className={styles.logo}>
          CHESSIGMA
        </a>
        <ul className={styles.navLinks}>
          <li><a href="#" className={styles.navLink}>Home</a></li>
          <li><a href="#" className={styles.navLink}>Train</a></li>
          <li><a href="#" className={styles.navLink}>Supercoach</a></li>
          <li><a href="#" className={styles.navLink}>Tools</a></li>
          <li><a href="#" className={styles.navLink}>About</a></li>
        </ul>
      </div>

      <div className={styles.navRight}>
        <a href="#" className={styles.whatsNew}>What&apos;s new</a>
        <button type="button" className={styles.signInBtn}>Sign in</button>
      </div>
    </nav>
  );
}
