import { useState, useRef } from "react";
import styles from "./css/login.module.css";
import { Eye, EyeOff } from "lucide-react";

export default function Signup() {
  const [mail, setMail] = useState("");
  const [password, setPassword] = useState("");
  const [recheckPassword, setRecheckPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const inputRef = useRef(null);

  function toggleShowPassword(e) {
    e.preventDefault();
    setShowPassword((showPassword) => !showPassword);
    inputRef.current.focus();
  }
  return (
    <>
      <div className={`${styles.input_fields} ${styles.name_container}`}>
        <input
          type="text"
          placeholder="First Name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          className={styles.input_name}
        />

        <input
          type="text"
          placeholder="Last Name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          className={styles.input_name}
        />
      </div>
      <div className={styles.input_fields}>
        <input
          type="mail"
          placeholder="abc@mail.com"
          className={styles.mail_input}
          value={mail}
          onChange={(e) => setMail(e.target.value)}
        />
        <div className={styles.password_container}>
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            className={styles.password_input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            ref={inputRef}
          />
        </div>
        <div>
          <div className={styles.password_container}>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Confirm Password"
              className={styles.password_input}
              value={recheckPassword}
              onChange={(e) => setRecheckPassword(e.target.value)}
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
        </div>
        <input type="button" className={styles.submit_button} value="Signup" />
      </div>
    </>
  );
}
