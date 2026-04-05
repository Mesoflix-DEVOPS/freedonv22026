import React from 'react';

export const makeLazyLoader =
    (importFn: () => Promise<any>, loaderFn: () => JSX.Element) => (component_name?: string) => {
        const LazyComponent = React.lazy(async () => {
            const module: any = await importFn();
            if (component_name) {
                return { default: module.default[component_name] || module[component_name] };
            }
            return module;
        });

        return (props: any) => (
            <React.Suspense fallback={loaderFn()}>
                <LazyComponent {...props} />
            </React.Suspense>
        );
    };
