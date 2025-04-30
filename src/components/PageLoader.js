import React from 'react';
import '../styles/PageLoader.css';

/**
 * PageLoader wrapper: Hides children until loading=false, then fades in.
 * Usage:
 *   <PageLoader loading={loading}>
 *     ...page content...
 *   </PageLoader>
 */
export default function PageLoader({ loading, children, style = {}, ...rest }) {
  return (
    <div
      className={`page-loader-fade${loading ? ' page-loader-hidden' : ' page-loader-visible'}`}
      style={style}
      {...rest}
    >
      {children}
    </div>
  );
}
