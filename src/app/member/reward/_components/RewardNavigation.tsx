import { Button, ButtonLink } from "@/app/_ui/primitives";

type MenuItem = {
  key: string;
  label: string;
  href: string;
  variant?: "primary" | "secondary";
  isForm?: boolean;
};

const ALL_MENU_ITEMS: MenuItem[] = [
  { key: "root-home", label: "홈", href: "/" },
  { key: "home", label: "리워더 홈", href: "/member/reward" },
  { key: "missions", label: "오늘의 미션", href: "/member/reward/missions" },
  // { key: "campaigns", label: "캠페인", href: "/member/reward/campaigns" },
  { key: "participations", label: "내 참여 내역", href: "/member/reward/participations" },
  { key: "payouts", label: "출금/정산", href: "/member/reward/payouts" },
  { key: "my-page", label: "마이페이지", href: "/member/reward/my-page" },
  { key: "logout", label: "로그아웃", href: "/api/auth/logout", variant: "secondary", isForm: true },
];

export function RewardNavigation() {
  const menuItems = ALL_MENU_ITEMS;

  return (
    <div className="flex flex-wrap gap-2">
      {menuItems.map((item) => {
        if (item.isForm) {
          return (
            <form key={item.key} action={item.href} method="post">
              <Button type="submit" variant={item.variant || "secondary"} size="sm">
                {item.label}
              </Button>
            </form>
          );
        }

        return (
          <ButtonLink key={item.key} href={item.href} variant={item.variant || "secondary"} size="sm">
            {item.label}
          </ButtonLink>
        );
      })}
    </div>
  );
}
