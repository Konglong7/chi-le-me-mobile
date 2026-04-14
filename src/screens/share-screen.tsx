import { useState } from 'react';
import { FaAngleRight, FaCamera, FaLocationDot, FaSackDollar, FaStore, FaXmark } from 'react-icons/fa6';
import { useAppStore } from '../app/store';
import { AppShell, BottomNav, ScreenScroller } from '../components/layout';

export function ShareScreen() {
  const { actions } = useAppStore();
  const [foodName, setFoodName] = useState('');
  const [shopName, setShopName] = useState('');
  const [price, setPrice] = useState('');
  const [address, setAddress] = useState('');
  const [rating, setRating] = useState(4);
  const [comment, setComment] = useState('');
  const canPublish = foodName.trim().length > 0;

  return (
    <AppShell>
      <div className="absolute left-0 top-0 z-40 flex h-[72px] w-full items-end border-b border-slate-100 bg-white px-4 pb-3">
        <div className="flex w-full items-center justify-between">
          <button type="button" onClick={() => actions.navigate('home')} className="p-2 text-xl">
            <FaXmark />
          </button>
          <h2 className="text-lg font-bold">分享我吃过的</h2>
          <button
            type="button"
            disabled={!canPublish}
            onClick={() =>
              actions.addShare({
                foodName,
                shopName,
                price,
                address,
                rating,
                comment,
              })
            }
            className="rounded-full bg-theme-50 px-3 py-1 text-sm font-bold text-theme-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
          >
            {canPublish ? '发布分享' : '填写美食名称'}
          </button>
        </div>
      </div>

      <ScreenScroller className="px-6 pb-[108px] pt-[88px]">
        <div className="mb-6 flex h-40 w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 text-slate-400 transition hover:bg-slate-100">
          <FaCamera className="mb-2 text-3xl" />
          <span className="text-sm">添加美食照片 (可选)</span>
        </div>

        <div className="space-y-6">
          <div>
            <input
              value={foodName}
              onChange={(event) => setFoodName(event.target.value)}
              placeholder="美食名称（必填，如：原味冰拿铁）"
              className="w-full border-b border-slate-200 pb-2 text-lg font-bold outline-none placeholder:text-slate-300 focus:border-theme-500"
            />
          </div>

          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <FaStore className="w-5 text-center text-slate-400" />
            <input
              value={shopName}
              onChange={(event) => setShopName(event.target.value)}
              placeholder="商家店名 (可选)"
              className="flex-1 text-sm outline-none"
            />
          </div>

          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <FaSackDollar className="w-5 text-center text-slate-400" />
            <input
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder="人均价格 ￥ (可选)"
              className="flex-1 text-sm outline-none"
            />
          </div>

          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <FaLocationDot className="w-5 text-center text-slate-400" />
            <div className="flex flex-1 items-center justify-between text-sm text-slate-400">
              <input
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                placeholder="所在位置"
                className="flex-1 outline-none placeholder:text-slate-400"
              />
              <FaAngleRight />
            </div>
          </div>

          <div className="pt-2">
            <div className="mb-3 text-sm font-bold text-slate-700">综合评分</div>
            <div className="flex gap-2 text-2xl text-slate-200">
              {Array.from({ length: 5 }).map((_, index) => {
                const active = index < rating;

                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setRating(index + 1)}
                    className={active ? 'text-yellow-400' : 'text-slate-200'}
                  >
                    ★
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-2">
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="随便说点什么评价一下吧... 味道怎么样？环境好吗？"
              className="h-28 w-full resize-none rounded-xl bg-slate-50 p-4 text-sm outline-none ring-1 ring-transparent focus:ring-theme-500"
            />
          </div>
        </div>
      </ScreenScroller>

      <BottomNav currentPage="home" onNavigate={actions.navigate} />
    </AppShell>
  );
}
