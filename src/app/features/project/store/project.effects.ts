import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { filter, map, take, tap } from 'rxjs/operators';
import {
  addProject,
  deleteProject,
  moveAllProjectBacklogTasksToRegularList,
  updateProject,
} from './project.actions';
import { SnackService } from '../../../core/snack/snack.service';
import { GlobalConfigService } from '../../config/global-config.service';
import { T } from '../../../t.const';
import { Project } from '../project.model';
import { Observable } from 'rxjs';
import { ReminderService } from '../../reminder/reminder.service';
import { TaskArchiveService } from '../../time-tracking/task-archive.service';
import { TimeTrackingService } from '../../time-tracking/time-tracking.service';

@Injectable()
export class ProjectEffects {
  private _actions$ = inject(Actions);
  private _snackService = inject(SnackService);
  private _taskArchiveService = inject(TaskArchiveService);
  private _globalConfigService = inject(GlobalConfigService);
  private _reminderService = inject(ReminderService);
  private _timeTrackingService = inject(TimeTrackingService);

  deleteProjectRelatedData: Observable<unknown> = createEffect(
    () =>
      this._actions$.pipe(
        ofType(deleteProject),
        tap(async ({ project, allTaskIds }) => {
          // NOTE: we also do stuff on a reducer level (probably better to handle on this level @TODO refactor)
          const id = project.id as string;
          this._taskArchiveService.removeAllArchiveTasksForProject(id);
          this._reminderService.removeRemindersByRelatedIds(allTaskIds);
          this._timeTrackingService.cleanupDataEverywhereForProject(id);

          // we also might need to account for this unlikely but very nasty scenario
          const cfg = await this._globalConfigService.cfg$.pipe(take(1)).toPromise();
          if (id === cfg.misc.defaultProjectId) {
            this._globalConfigService.updateSection('misc', { defaultProjectId: null });
          }
        }),
      ),
    { dispatch: false },
  );

  moveAllProjectToTodayListWhenBacklogIsDisabled$: Observable<unknown> = createEffect(
    () =>
      this._actions$.pipe(
        ofType(updateProject),
        filter((a) => a.project.changes.isEnableBacklog === false),
        map((a) => {
          return moveAllProjectBacklogTasksToRegularList({
            projectId: a.project.id as string,
          });
        }),
      ),
  );

  // CURRENTLY NOT IMPLEMENTED
  // archiveProject: Observable<unknown> = createEffect(
  //   () =>
  //     this._actions$.pipe(
  //       ofType(archiveProject.type),
  //       tap(async ({ id }) => {
  //         await this._pfapiService.archiveProject(id);
  //         // TODO remove reminders
  //         this._snackService.open({
  //           ico: 'archive',
  //           msg: T.F.PROJECT.S.ARCHIVED,
  //         });
  //       }),
  //     ),
  //   { dispatch: false },
  // );
  // unarchiveProject: Observable<unknown> = createEffect(
  //   () =>
  //     this._actions$.pipe(
  //       ofType(unarchiveProject.type),
  //       tap(async ({ id }) => {
  //         await this._pfapiService.unarchiveProject(id);
  //
  //         this._snackService.open({
  //           ico: 'unarchive',
  //           msg: T.F.PROJECT.S.UNARCHIVED,
  //         });
  //       }),
  //     ),
  //   { dispatch: false },
  // );

  // PURE SNACKS
  // -----------

  snackUpdateBaseSettings$: Observable<unknown> = createEffect(
    () =>
      this._actions$.pipe(
        ofType(updateProject.type),
        tap(() => {
          this._snackService.open({
            type: 'SUCCESS',
            msg: T.F.PROJECT.S.UPDATED,
          });
        }),
      ),
    { dispatch: false },
  );

  onProjectCreatedSnack: Observable<unknown> = createEffect(
    () =>
      this._actions$.pipe(
        ofType(addProject.type),
        tap(({ project }) => {
          this._snackService.open({
            ico: 'add',
            type: 'SUCCESS',
            msg: T.F.PROJECT.S.CREATED,
            translateParams: { title: (project as Project).title },
          });
        }),
      ),
    { dispatch: false },
  );

  showDeletionSnack: Observable<unknown> = createEffect(
    () =>
      this._actions$.pipe(
        ofType(deleteProject.type),
        tap(() => {
          this._snackService.open({
            ico: 'delete_forever',
            msg: T.F.PROJECT.S.DELETED,
          });
        }),
      ),
    { dispatch: false },
  );
}
