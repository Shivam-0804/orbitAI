import { useState } from "react";
import styles from "./css/login.module.css";
import { Eye, EyeOff } from "lucide-react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";

// Schema for login validation
const LoginSchema = Yup.object().shape({
  email: Yup.string()
    .email("Invalid email format")
    .required("Email is required"),
  password: Yup.string().required("Password is required"),
});

// Self-contained Google Icon SVG
const GoogleIcon = () => (
  <svg className={styles.google_icon} viewBox="0 0 24 24" >
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
    <path d="M1 1h22v22H1z" fill="none" />
  </svg>
);

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <Formik
      initialValues={{ email: "", password: "" }}
      validationSchema={LoginSchema}
      onSubmit={(values, { setSubmitting }) => {
        console.log("Login Data:", values);
        setTimeout(() => {
          alert("Login successful!");
          setSubmitting(false);
        }, 500);
      }}
    >
      {({ errors, touched, isSubmitting }) => (
        <Form className={styles.form_wrapper}>
          <h2 className={styles.title}>Welcome Back!</h2>
          <p className={styles.subtitle}>Please enter your details to login.</p>

          <div className={styles.input_wrapper}>
            <label htmlFor="email" className={styles.label}>Email</label>
            <Field
              name="email"
              type="email"
              placeholder="you@example.com"
              className={`${styles.input_field} ${touched.email && errors.email ? styles.invalid_field : ""}`}
            />
            <ErrorMessage name="email" component="p" className={styles.error_message} />
          </div>

          <div className={styles.input_wrapper}>
             <label htmlFor="password" className={styles.label}>Password</label>
            <div className={styles.password_container}>
              <Field
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                className={`${styles.input_field} ${touched.password && errors.password ? styles.invalid_field : ""}`}
              />
              <div className={styles.eye_icon} onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </div>
            </div>
             <ErrorMessage name="password" component="p" className={styles.error_message} />
          </div>

          <button type="submit" className={styles.submit_button} disabled={isSubmitting}>
            {isSubmitting ? "Logging In..." : "Login"}
          </button>
          
          <div className={styles.divider}>
             <span>OR</span>
          </div>

          <button type="button" className={styles.google_login_button}>
            <GoogleIcon />
            <span>Sign in with Google</span>
          </button>
        </Form>
      )}
    </Formik>
  );
}