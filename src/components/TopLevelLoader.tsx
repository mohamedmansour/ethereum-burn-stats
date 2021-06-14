import React from 'react';

interface TopLevelLoaderProps {
  children: React.ReactNode;
}

export function TopLevelLoader(props: TopLevelLoaderProps) {
  return (
    <div>
      <span>{props.children}</span>
    </div>
  );
}