import React, { useState, useRef } from 'react';
import '../styles/FloatingLabelInput.css';

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

  // Animate icon on click and preserve caret position
  const handleIconClick = (e) => {
    if (inputRef.current) {
      const { selectionStart, selectionEnd } = inputRef.current;
      setShowPassword((prev) => !prev);
      setTimeout(() => {
        if (inputRef.current && typeof selectionStart === 'number' && typeof selectionEnd === 'number') {
          inputRef.current.setSelectionRange(selectionStart, selectionEnd);
          inputRef.current.focus();
        }
      }, 0);
    } else {
      setShowPassword((prev) => !prev);
    }
    if (onIconClick) onIconClick(e);
    setIconActive(true);
    setTimeout(() => setIconActive(false), 230); // match CSS transition
  };

  // Determine if this is a password field
  const isPassword = type === 'password';
  // Toggle input type for password visibility
  const inputType = isPassword && showPassword ? 'text' : type;
  const inputStyle = {};

  // Ref for caret position preservation
  const inputRef = useRef(null);

  // Adjust padding if rightElement or icon
  const inputPaddingRight = rightElement ? 50 : icon ? 44 : undefined;

  // Generate unique id for accessibility
  const inputId = name || `floating-input-${label.replace(/\s+/g, '-').toLowerCase()}`;

  const hasValue = value && value.length > 0;

  return (
    <div className={`input-group${icon ? ' with-icon' : ''}${rightElement ? ' with-right-element' : ''}`} style={{ position: 'relative', width: '100%' }}>
      <input
        ref={inputRef}
        id={inputId}
        required
        type={inputType}
        value={value}
        onChange={onChange}
        name={name}
        autoComplete={autoComplete}
        className={`input${hasValue ? ' has-value' : ''}`}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{ ...inputStyle, paddingRight: inputPaddingRight }}
        {...rest}
      />
      <label htmlFor={inputId} className={`user-label${hasValue ? ' label-float' : ''}`}>{label}</label>
      {icon && isPassword && (
        <span
          className={`input-icon${iconActive ? ' icon-bounce' : ''}`}
          onClick={handleIconClick}
          onMouseDown={e => e.preventDefault()}
          tabIndex={0}
          role="button"
        >
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
