import { useState } from "react";
import styles from "./css/login.module.css"; // Uses the same unified CSS
import { Eye, EyeOff } from "lucide-react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";

const SignupSchema = Yup.object().shape({
  firstName: Yup.string().required("First Name is required"),
  lastName: Yup.string().required("Last Name is required"),
  email: Yup.string()
    .email("Invalid email format")
    .required("Email is required"),
  password: Yup.string()
    .required("Password is required")
    .min(8, "Password must be at least 8 characters")
    .matches(/[A-Z]/, "Must contain at least one uppercase letter")
    .matches(/[a-z]/, "Must contain at least one lowercase letter")
    .matches(/[0-9]/, "Must contain at least one number")
    .matches(/[@$!%*?&]/, "Must contain at least one special character"),
  recheckPassword: Yup.string()
    .oneOf([Yup.ref("password")], "Passwords must match")
    .required("Confirm Password is required"),
});

export default function Signup() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <Formik
      initialValues={{
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        recheckPassword: "",
      }}
      validationSchema={SignupSchema}
      onSubmit={(values, { setSubmitting }) => {
        console.log("Signup Data:", values);
        setTimeout(() => {
          alert("Signup successful!");
          setSubmitting(false);
        }, 500);
      }}
    >
      {({ errors, touched, isSubmitting }) => (
        <Form className={styles.form_wrapper}>
          <h2 className={styles.title}>Create an Account</h2>
          <p className={styles.subtitle}>Start your journey with us today.</p>

          <div className={styles.name_container}>
            <div className={styles.input_wrapper}>
              <label htmlFor="firstName" className={styles.label}>
                First Name
              </label>
              <Field
                name="firstName"
                type="text"
                placeholder="John"
                className={`${styles.input_field} ${touched.firstName && errors.firstName ? styles.invalid_field : ""}`}
              />
              <ErrorMessage
                name="firstName"
                component="p"
                className={styles.error_message}
              />
            </div>
            <div className={styles.input_wrapper}>
              <label htmlFor="lastName" className={styles.label}>
                Last Name
              </label>
              <Field
                name="lastName"
                type="text"
                placeholder="Doe"
                className={`${styles.input_field} ${touched.lastName && errors.lastName ? styles.invalid_field : ""}`}
              />
              <ErrorMessage
                name="lastName"
                component="p"
                className={styles.error_message}
              />
            </div>
          </div>

          <div className={styles.input_wrapper}>
            <label htmlFor="email" className={styles.label}>
              Email
            </label>
            <Field
              name="email"
              type="email"
              placeholder="you@example.com"
              className={`${styles.input_field} ${touched.email && errors.email ? styles.invalid_field : ""}`}
            />
            <ErrorMessage
              name="email"
              component="p"
              className={styles.error_message}
            />
          </div>

          <div className={styles.input_wrapper}>
            <label htmlFor="password" className={styles.label}>
              Password
            </label>
            <div className={styles.password_container}>
              <Field
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Create a strong password"
                className={`${styles.input_field} ${touched.password && errors.password ? styles.invalid_field : ""}`}
              />
              <div
                className={styles.eye_icon}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </div>
            </div>
            <ErrorMessage
              name="password"
              component="p"
              className={styles.error_message}
            />
          </div>

          <div className={styles.input_wrapper}>
            <label htmlFor="recheckPassword" className={styles.label}>
              Confirm Password
            </label>
            <Field
              name="recheckPassword"
              type="password"
              placeholder="Confirm your password"
              className={`${styles.input_field} ${touched.recheckPassword && errors.recheckPassword ? styles.invalid_field : ""}`}
            />
            <ErrorMessage
              name="recheckPassword"
              component="p"
              className={styles.error_message}
            />
          </div>

          <button
            type="submit"
            className={styles.submit_button}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating Account..." : "Sign Up"}
          </button>
        </Form>
      )}
    </Formik>
  );
}
