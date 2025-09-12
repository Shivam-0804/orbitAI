import { useState, useRef } from "react";
import styles from "./css/login.module.css";
import { Eye, EyeOff } from "lucide-react";

export default function Login() {
  const [mail, setMail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const inputRef = useRef(null);

  function toggleShowPassword(e) {
    e.preventDefault();
    setShowPassword((showPassword) => !showPassword);
    inputRef.current.focus();
  }
  return (
    <>
      <div className={styles.input_fields}>
        <input
          type="mail"
          placeholder="abc@mail.com"
          className={styles.mail_input}
          value={mail}
          onChange={(e) => setMail(e.target.value)}
        />
        <div>
          <div className={styles.password_container}>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              className={styles.password_input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              ref={inputRef}
            />
            {showPassword ? (
              <Eye
                className={styles.eye_style}
                onMouseDown={(e) => toggleShowPassword(e)}
              />
            ) : (
              <EyeOff
                className={styles.eye_style}
                onMouseDown={(e) => toggleShowPassword(e)}
              />
            )}
          </div>
          <p className={styles.forgot_password}>Forgot Password?</p>
        </div>
        <input type="button" className={styles.submit_button} value="Login" />
      </div>
    </>
  );
}
