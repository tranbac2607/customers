import { Skeleton, Card } from 'antd';

// Loading boundary for /customers/[id]/edit.
//
// NOTE: Do NOT use `Skeleton.Input` / `Skeleton.Button` / `Skeleton.Avatar` /
// `Skeleton.Image` here. `next.config.ts` enables
// `experimental.optimizePackageImports: ['antd']`, which rewrites
// `import { Skeleton } from 'antd'` to a direct module import. That rewrite
// preserves the Skeleton function itself but drops the static `.Input` /
// `.Button` / etc. property assignments, so `Skeleton.Input` resolves to
// `undefined` and React throws "Element type is invalid ... got: undefined"
// (React #130) on first render. Use a plain styled placeholder instead.

export default function Loading() {
  return (
    <div>
      {/* Single-line placeholder where a 120-wide small input would be */}
      <div
        style={{
          width: 120,
          height: 24,
          background: 'rgba(0, 0, 0, 0.06)',
          borderRadius: 4,
          marginBottom: 16,
        }}
      />
      <Skeleton active title paragraph={{ rows: 1 }} style={{ maxWidth: 480, marginBottom: 24 }} />
      <Card>
        <Skeleton active paragraph={{ rows: 6 }} />
        <Skeleton active paragraph={{ rows: 6 }} style={{ marginTop: 24 }} />
      </Card>
    </div>
  );
}
