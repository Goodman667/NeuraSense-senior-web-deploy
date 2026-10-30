import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

/**
 * Tailwind 3.4 gradients read `var(--tw-gradient-from-position)`, a variable whose value is
 * empty. Some browsers (older Chromium cores, e.g. several Chinese browsers) treat an empty
 * variable as invalid, which throws away the whole gradient: buttons with white text on a
 * gradient then become white on white. We don't use gradient stop positions, so the position
 * variables are removed from the generated CSS.
 */
const gradientWithoutEmptyVars = () => ({
    postcssPlugin: 'neurasense-gradient-without-empty-vars',
    Declaration(decl) {
        if (/^--tw-gradient-(from|via|to)-position$/.test(decl.prop)) {
            decl.remove();
            return;
        }
        if (decl.value.includes('-position)')) {
            const next = decl.value.replace(/\s*var\(--tw-gradient-(?:from|via|to)-position\)/g, '');
            if (next !== decl.value) decl.value = next;
        }
    },
});
gradientWithoutEmptyVars.postcss = true;

export default {
    plugins: [tailwindcss, autoprefixer, gradientWithoutEmptyVars()],
};
