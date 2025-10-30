import React from "react";
import ErrorBoundary from "../components/ErrorBoundary";
export default function App({ Component, pageProps }) {
  return (
    <ErrorBoundary>
      <Component {...pageProps} />
    </ErrorBoundary>
  );
}
