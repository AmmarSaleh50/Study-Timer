import React, { useState } from 'react';
import './FloatingLabelInput.css';

/**
 * Props:
 * - label: string (label to display)
 * - type: string (input type, e.g. 'text', 'password', 'time', etc.)
 * - value: string
 * - onChange: function (e)
 * - name: string (optional)
 * - autoComplete: string (optional)
 * - icon: ReactNode (optional, for password fields)
 * - onIconClick: function (optional, for password fields)
 * - rightElement: ReactNode (optional, for custom right element)
 * - ...rest: any other input props
 */
export default function FloatingLabelInput({
  label,
  type = 'text',
  value,
  onChange,
  name,
  autoComplete,
  icon,
  onIconClick,
  rightElement,
  ...rest
}) {
  const [focused, setFocused] = useState(false);
  const [iconActive, setIconActive] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Animate icon on click
  const handleIconClick = (e) => {
    setShowPassword((prev) => !prev);
    if (onIconClick) onIconClick(e);
    setIconActive(true);
    setTimeout(() => setIconActive(false), 230); // match CSS transition
  };

  // Determine if this is a password field
  const isPassword = type === 'password';
  // Always render as password, but toggle text security with CSS
  const inputType = isPassword ? 'password' : type;
  const inputStyle = isPassword && showPassword ? { WebkitTextSecurity: 'none', MozTextSecurity: 'none', textSecurity: 'none' } : {};

  // Adjust padding if rightElement or icon
  const inputPaddingRight = rightElement ? 50 : icon ? 44 : undefined;

  return (
    <div className={`floating-label-input${focused || value ? ' focused' : ''}${icon ? ' with-icon' : ''}${rightElement ? ' with-right-element' : ''}`}
         style={{ position: 'relative' }}>
      <input
        type={inputType}
        value={value}
        onChange={onChange}
        name={name}
        autoComplete={autoComplete}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{ ...inputStyle, paddingRight: inputPaddingRight }}
        {...rest}
      />
      <label>{label}</label>
      {icon && isPassword && (
        <span className={`input-icon${iconActive ? ' icon-bounce' : ''}`} onClick={handleIconClick} tabIndex={0} role="button">
          {showPassword ? '🙈' : '👁️'}
        </span>
      )}
      {icon && !isPassword && (
        <span className={`input-icon${iconActive ? ' icon-bounce' : ''}`} onClick={handleIconClick} tabIndex={0} role="button">
          {icon}
        </span>
      )}
      {rightElement && (
        <span className="input-right-element">
          {rightElement}
        </span>
      )}
    </div>
  );
}
