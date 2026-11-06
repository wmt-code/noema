import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
export function LoginLayout({
  children,
  register,
  busy,
  switchMode
}: {
  children: ReactNode
  register: boolean
  busy: boolean
  switchMode: () => void
}) {
  return (
    <div className="flex min-h-dvh">
      <div className="bg-primary hidden lg:block lg:w-1/3">
        <div className="flex h-full flex-col items-center justify-center p-12 text-center">
          <div className="space-y-6">
            <img
              className="brand-mark mx-auto size-12"
              alt=""
              src="./brand/icon-48.png"
            />
            <div className="space-y-2">
              <p className="text-primary-foreground text-5xl font-light">
                Noema
              </p>
              <p className="text-primary-foreground/80 text-xl">
                短剧创作工作台
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-background flex w-full items-center justify-center p-8 lg:w-2/3">
        <div className="w-full max-w-md space-y-10 py-24 lg:py-32">
          <div className="space-y-4 text-center">
            <h1 className="font-medium tracking-tight">
              {register ? '注册 Noema' : '登录 Noema'}
            </h1>
            <div className="text-muted-foreground mx-auto max-w-xl">
              {register
                ? '创建账号，建立你的第一个短剧项目。'
                : '输入邮箱和密码，继续管理你的项目与剧集。'}
            </div>
          </div>
          <div className="space-y-4">
            {children}

            <p className="text-muted-foreground text-center text-xs">
              {register ? '已有账号？' : '还没有账号？'}{' '}
              <Button variant="link" disabled={busy} onClick={switchMode}>
                {register ? '返回登录' : '注册账号'}
              </Button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
