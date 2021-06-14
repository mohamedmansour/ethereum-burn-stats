import React from 'react';

interface LoaderProps {
  children: React.ReactNode;
}

export function Loader(props: LoaderProps) {
  return (
    <div>
      <span>{props.children}</span>
    </div>
  );
}