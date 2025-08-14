import React from "react";
import { Input } from "../ui";

interface SearchBarProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onSearch?: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = "Buscar...",
  value,
  onChange,
  onSearch,
}) => {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && onSearch) {
      onSearch();
    }
  };

  return (
    <Input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyPress={handleKeyPress}
      icon="🔍"
    />
  );
};
