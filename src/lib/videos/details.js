import { Link, Globe, Lock } from "lucide-react"

export const categories = [
    'Education',
    'Entertainment',
    'Gaming',
    'Music',
    'Technology',
    'Sports',
    'Travel',
    'Other',
]

export const visibilites = [
    {type: 'Public', icon: Globe},
    {type: 'Unlisted', icon: Link},
    {type: 'Private', icon: Lock},
]

export function capitalizeFirstLetter(word) {
  if (!word) {
    return ""; // Handle empty string
  }
  return word.charAt(0).toUpperCase() + word.slice(1);
}