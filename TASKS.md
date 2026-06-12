# Tareas pendientes

## Prioridad alta

### [ ] Desplegar nuevo zip en cPanel
El zip `~/Desktop/quiniela-mundial-2026.zip` (770K, 2026-06-11) incluye el fix de `piccolore` y es el que debe estar en producción.

Pasos exactos:
1. En cPanel File Manager → `/public_html/asaflopez/quiniela/`
2. Borrar la carpeta `dist/` existente
3. Subir `quiniela-mundial-2026.zip` y extraerlo
4. Botón **Run NPM Install**
5. Botón **Restart**
6. Verificar en `/admin/setup` que pida crear cuenta (si es BD nueva)
7. Probar login en `/admin`

> El `stderr.log` de cPanel es **acumulativo** — ignorar errores viejos; buscar la última línea de error para diagnosticar.

---

## Prioridad media

### [ ] Endpoint de reclamos para participante (quiniela API)
Actualmente `TeamsTab.astro` muestra el botón de reclamo pero no hay ruta API para que el participante reclame/des-reclame un equipo desde el frontend. Confirmar si ya existe o hay que crear:
- `POST /api/quiniela/[slug]/claim` — reclama equipo
- `DELETE /api/quiniela/[slug]/claim` — quita reclamo

### [ ] Resultado final de la quiniela
No existe página ni lógica para calcular y mostrar el ganador de la quiniela una vez terminado el torneo. Por implementar:
- Integración con ESPN API para resultados reales
- Cálculo de puntos por participante
- Página de resultados finales

### [ ] Notificaciones por correo
No hay envío de emails. Podría necesitarse para:
- Enviar el enlace de acceso al participante al agregarlo
- Notificar cuando se asignan equipos

---

## Prioridad baja / Mejoras

### [ ] Favicon personalizado
El `public/favicon.svg` es genérico. Reemplazar con uno alusivo al Mundial 2026.

### [ ] Modo oscuro / claro
El diseño actual es solo oscuro. Si el usuario quiere soporte light mode, hay que agregarlo.

### [ ] Tests
No hay tests. Si se quieren agregar: Vitest para lógica de lib/ y Playwright para e2e.

### [ ] Variables de entorno en producción
El `.env` está incluido en el zip como fallback pero lo ideal es que las credenciales vengan solo de las env vars de cPanel (ya configuradas). Verificar que `.env` no sea necesario en producción y, si no lo es, excluirlo del zip por seguridad.
