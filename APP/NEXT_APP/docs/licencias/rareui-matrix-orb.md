# Matrix Orb — rareui

El núcleo del centinela de seguridad de la portada (`src/modules/landing/portada/secciones/matrixOrb.ts`) es una adaptación a lienzo 2D del componente **Matrix Orb** de rareui, publicado bajo licencia MIT.

- Origen: https://www.rareui.com/ (registro `https://www.rareui.com/r/matrix-orb.json`)
- Adaptación: reescritura en TypeScript sin React ni WebGL, con estados `idle` / `listening` / `thinking`, color variable y parada del bucle cuando el núcleo no está en pantalla. Se conserva la lógica de rejilla, envolvente e intensidades del original.
- La portada muestra el crédito «Núcleo: Matrix Orb de rareui (MIT), adaptado.» junto al centinela.

## Licencia original (MIT)

```
MIT License

Copyright (c) rareui

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
