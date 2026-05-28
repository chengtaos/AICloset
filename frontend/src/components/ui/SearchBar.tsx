import { Input } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { colors } from "../../styles/tokens";

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  width?: number | string;
  allowClear?: boolean;
}

export default function SearchBar({
  value,
  onChange,
  placeholder = "搜索",
  width = 160,
  allowClear = true,
}: Props) {
  return (
    <Input
      prefix={<SearchOutlined style={{ color: colors.textTertiary }} />}
      placeholder={placeholder}
      size="middle"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      allowClear={allowClear}
      style={{
        width,
        flexShrink: 0,
      }}
    />
  );
}
