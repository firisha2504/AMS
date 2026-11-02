@echo off
echo ========================================================================
echo          WAIVE OLD ATTENDANCE-BASED PENALTIES
echo ========================================================================
echo.
echo This script will WAIVE (forgive/cancel) all penalties that were created
echo for "Absent from meeting" under the old rules.
echo.
echo What this does:
echo   - Finds all OUTSTANDING penalties with "meeting" in the reason
echo   - Changes their status from OUTSTANDING to WAIVED
echo   - Reduces members' outstanding balances
echo   - Members do NOT have to pay these penalties
echo.
echo Why we're doing this:
echo   - Old rule: Absent from meeting = penalty (unfair)
echo   - New rule: Don't pay weekly contribution = penalty (fair)
echo   - Give members a fresh start with the new rules
echo.
echo ========================================================================
pause
echo.
echo Running script...
echo.

npx tsx scripts/waive-attendance-penalties.ts

echo.
echo ========================================================================
pause
