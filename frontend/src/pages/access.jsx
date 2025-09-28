import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import styles from "./css/access.module.css";
import { MoveLeft } from "lucide-react";

import Login from "../components/login";
import Signup from "../components/signup";

export default function Access() {
  const images = ["/login/login_img_1.png", "/login/login_img_2.png"];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [option, setOption] = useState("login");

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [images.length]);

  return (
    <div className={styles.parent}>
      <div className={styles.container}>
        {/* Image slideshow */}
        <div className={styles.img_container}>
          {images.map((src, index) => (
            <img
              key={index}
              src={src}
              alt="Decorative background"
              className={`${styles.img_style} ${
                index === currentIndex ? styles.img_active : ""
              }`}
            />
          ))}
          <div className={styles.dots}>
            {images.map((_, index) => (
              <div
                key={index}
                className={`${styles.dot} ${
                  index === currentIndex ? styles.dot_active : ""
                }`}
                onClick={() => setCurrentIndex(index)}
              />
            ))}
          </div>
          <Link to="/" className={styles.back_button}>
            <MoveLeft className={styles.back_arrow} />
          </Link>
        </div>

        {/* Form Content */}
        <div className={styles.content_container}>
          <div className={styles.login_header}>
            <span
              className={`${styles.login_header_text} ${
                option === "login" ? styles.selected_option : ""
              }`}
              onClick={() => setOption("login")}
            >
              Login
            </span>
            <span
              className={`${styles.login_header_text} ${
                option === "signup" ? styles.selected_option : ""
              }`}
              onClick={() => setOption("signup")}
            >
              Sign Up
            </span>
          </div>

          {option === "login" ? <Login /> : <Signup />}

          <div className={styles.footer}>
            or continue as{" "}
            <Link to="/orbit" className={styles.guest_login}>
              Guest
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}