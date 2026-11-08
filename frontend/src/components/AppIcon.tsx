import {
  MdArrowForward,
  MdCall,
  MdCheckCircle,
  MdContrast,
  MdFilterAlt,
  MdHearing,
  MdLiveTv,
  MdLocationOn,
  MdMailOutline,
  MdPets,
  MdPhotoCamera,
  MdSearch,
} from "react-icons/md";
import type { IconType } from "react-icons";

const icons = {
  arrowForward: MdArrowForward,
  call: MdCall,
  checkCircle: MdCheckCircle,
  contrast: MdContrast,
  filter: MdFilterAlt,
  hearing: MdHearing,
  liveTv: MdLiveTv,
  location: MdLocationOn,
  mail: MdMailOutline,
  pets: MdPets,
  photoCamera: MdPhotoCamera,
  search: MdSearch,
} satisfies Record<string, IconType>;

export type AppIconName = keyof typeof icons;

export default function AppIcon({
  name,
  className,
  style,
}: {
  name: AppIconName;
  className?: string;
  style?: React.CSSProperties;
}) {
  const Icon = icons[name];
  return <Icon className={className} style={style} aria-hidden="true" focusable="false" />;
}
