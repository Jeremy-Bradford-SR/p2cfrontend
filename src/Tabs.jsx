import React, { useState } from 'react';

const Tabs = ({ children }) => {
  const [activeTab, setActiveTab] = useState(children[0].props.label);

  const handleClick = (e, newActiveTab) => {
    e.preventDefault();
    setActiveTab(newActiveTab);
  };

  return (
    <div>
      <ul className="tabs">
        {children.map(child => (
          <li
            key={child.props.label}
            className={child.props.label === activeTab ? 'active' : ''}
            onClick={e => handleClick(e, child.props.label)}
          >
            {child.props.label}
          </li>
        ))}
      </ul>
      {children.map(child => {
        if (child.props.label === activeTab) {
          return <div key={child.props.label}>{child.props.children}</div>;
        }
        return null;
      })}
    </div>
  );
};

const Tab = ({ label, children }) => {
  return (
    <div label={label} className="tab-content">
      {children}
    </div>
  );
};

export { Tabs, Tab };
