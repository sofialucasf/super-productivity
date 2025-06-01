import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { PlannerActions } from './planner.actions';
import { filter, tap } from 'rxjs/operators';
import { SnackService } from '../../../core/snack/snack.service';
import { T } from 'src/app/t.const';
import { PlannerService } from '../planner.service';
import { DatePipe } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
import { getWorklogStr } from '../../../util/get-work-log-str';

@Injectable()
export class PlannerEffects {
  private _actions$ = inject(Actions);
  private _snackService = inject(SnackService);
  private _plannerService = inject(PlannerService);
  private _datePipe = inject(DatePipe);
  private _translateService = inject(TranslateService);

  planForDaySnack$ = createEffect(
    () => {
      return this._actions$.pipe(
        ofType(PlannerActions.planTaskForDay),
        filter((action) => !!action.isShowSnack),
        tap(async (action) => {
          const isForToday = action.day === getWorklogStr();
          const formattedDate = isForToday
            ? this._translateService.instant(T.G.TODAY_TAG_TITLE)
            : (this._datePipe.transform(action.day, 'shortDate') as string);

          this._snackService.open({
            type: 'SUCCESS',
            msg: T.F.PLANNER.S.TASK_PLANNED_FOR,
            ico: 'today',
            translateParams: {
              date: formattedDate,
              extra: await this._plannerService.getSnackExtraStr(action.day),
            },
          });
        }),
      );
    },
    { dispatch: false },
  );
}
